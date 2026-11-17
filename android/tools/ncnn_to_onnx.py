"""Rebuilds the bundled ncnn model as an ONNX graph for the Android app.

The desktop app runs 4xLSDIRCompactC3 through ncnn, as the .param/.bin pair
in resources/models. Android has no ncnn engine of ours, but ONNX Runtime
runs everywhere a phone or a tablet does, GPU or not. Rather than converting
the author's PyTorch weights again, which would be a second, independent
conversion to vouch for, this reads the exact weights the desktop app ships
and writes them out unchanged as an ONNX graph of the same architecture, so
both apps compute the same function.

The architecture is SRVGGNet ("Compact"): a 3x3 convolution and PReLU, 16
more of those at 64 channels, a last 3x3 convolution to 3 * 4 * 4 channels,
a pixel shuffle by 4, and the input upsampled by nearest neighbour added on
top. That is read off the .param file, not assumed: this script checks every
layer against it and refuses anything else.

Weight storage, ncnn's own: each convolution's weights are preceded by a
4-byte tag, 0x01306B47 meaning IEEE half floats follow; biases and PReLU
slopes are raw 32-bit floats. The whole file must be consumed exactly.

Usage: python3 ncnn_to_onnx.py model.param model.bin out.onnx
"""
import struct
import sys

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

FP16_TAG = 0x01306B47


def parse_param(path):
    lines = open(path).read().split("\n")
    assert lines[0].strip() == "7767517", "not an ncnn param file"
    layers = []
    for line in lines[2:]:
        parts = line.split()
        if not parts:
            continue
        kind, name = parts[0], parts[1]
        n_in, n_out = int(parts[2]), int(parts[3])
        rest = parts[4:]
        inputs, outputs = rest[:n_in], rest[n_in:n_in + n_out]
        params = {}
        for kv in rest[n_in + n_out:]:
            k, v = kv.split("=")
            params[int(k)] = v
        layers.append((kind, name, inputs, outputs, params))
    return layers


class Reader:
    def __init__(self, path):
        self.data = open(path, "rb").read()
        self.pos = 0

    def u32(self):
        v = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return v

    def f16(self, n):
        a = np.frombuffer(self.data, "<f2", n, self.pos).astype(np.float32)
        self.pos += n * 2
        self.pos += (-self.pos) % 4  # ncnn pads half-float blocks to 4 bytes
        return a

    def f32(self, n):
        a = np.frombuffer(self.data, "<f4", n, self.pos).copy()
        self.pos += n * 4
        return a

    def done(self):
        return self.pos == len(self.data)


def convert(param_path, bin_path, out_path):
    layers = parse_param(param_path)
    r = Reader(bin_path)
    nodes, inits = [], []
    name_of = {}  # ncnn blob -> onnx tensor
    convs = 0

    for kind, name, ins, outs, p in layers:
        if kind == "Input":
            name_of[outs[0]] = "input"
        elif kind == "Split":
            for o in outs:
                name_of[o] = name_of[ins[0]]
        elif kind == "Convolution":
            out_ch = int(p[0])
            k = int(p[1])
            assert k == 3 and p.get(4) == "1" and p.get(5) == "1", f"{name}: unexpected conv"
            count = int(p[6])
            in_ch = count // (out_ch * k * k)
            assert in_ch * out_ch * k * k == count
            tag = r.u32()
            assert tag == FP16_TAG, f"{name}: weight tag {tag:#x}"
            w = r.f16(count).reshape(out_ch, in_ch, k, k)
            b = r.f32(out_ch)
            inits += [numpy_helper.from_array(w, f"{name}.w"),
                      numpy_helper.from_array(b, f"{name}.b")]
            nodes.append(helper.make_node(
                "Conv", [name_of[ins[0]], f"{name}.w", f"{name}.b"], [name],
                kernel_shape=[3, 3], pads=[1, 1, 1, 1]))
            name_of[outs[0]] = name
            convs += 1
        elif kind == "PReLU":
            n = int(p[0])
            slope = r.f32(n).reshape(n, 1, 1)
            inits.append(numpy_helper.from_array(slope, f"{name}.slope"))
            nodes.append(helper.make_node("PRelu", [name_of[ins[0]], f"{name}.slope"], [name]))
            name_of[outs[0]] = name
        elif kind == "PixelShuffle":
            assert p[0] == "4" and p.get(1, "0") == "0"
            # PyTorch's PixelShuffle, which is ONNX DepthToSpace in CRD order.
            nodes.append(helper.make_node("DepthToSpace", [name_of[ins[0]]], [name],
                                          blocksize=4, mode="CRD"))
            name_of[outs[0]] = name
        elif kind == "Interp":
            assert p[0] == "1", "only nearest-neighbour upsampling is expected"
            scales = numpy_helper.from_array(np.array([1, 1, 4, 4], np.float32), f"{name}.scales")
            inits.append(scales)
            nodes.append(helper.make_node(
                "Resize", [name_of[ins[0]], "", f"{name}.scales"], [name],
                mode="nearest", coordinate_transformation_mode="asymmetric",
                nearest_mode="floor"))
            name_of[outs[0]] = name
        elif kind == "BinaryOp":
            assert p.get(0, "0") == "0", "only addition is expected"
            nodes.append(helper.make_node("Add", [name_of[ins[0]], name_of[ins[1]]], ["output"]))
            name_of[outs[0]] = "output"
        else:
            raise SystemExit(f"unsupported layer {kind} ({name})")

    assert r.done(), f"{len(r.data) - r.pos} bytes of weights left unread"
    assert convs == 18, f"expected 18 convolutions, found {convs}"

    graph = helper.make_graph(
        nodes, "4xLSDIRCompactC3",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, "h", "w"])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, "H", "W"])],
        inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)],
                              producer_name="symps-upscale ncnn_to_onnx")
    # Old enough for every ONNX Runtime release an Android build would bundle.
    model.ir_version = 8
    model.doc_string = (
        "4xLSDIRCompactC3 by Philip Hofmann, CC BY 4.0. Weights taken unchanged "
        "from the ncnn conversion published by the Upscayl project and written "
        "out as ONNX by Symp's (format change only).")
    onnx.checker.check_model(model)
    onnx.save(model, out_path)
    print(f"{out_path}: {convs} convolutions, {len(inits)} tensors")


if __name__ == "__main__":
    convert(*sys.argv[1:4])
