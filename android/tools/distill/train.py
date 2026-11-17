"""Trains the fast Android model by imitation of the shipped one.

The student keeps the shipped model's shape (SRVGGNet: 3x3 convolutions with
PReLU between them, a pixel shuffle, and the input enlarged and added back)
but is far smaller, and enlarges by 2 directly instead of 4: x2 is all the
app ever delivers, and it saves both the larger output layer and the 2x2
averaging. Its target is exactly what the app used to produce: the shipped
model's output, mirror-padded, x4, averaged to x2 (see make_dataset.py).

The ONNX file is written by hand from the trained weights, like the
converter in the parent directory, so the graph is exactly the one described
here at a fixed opset, with nothing a given exporter version decided to add.

Usage: python3 train.py <data_dir> <features> <body_convs> <steps> <out.onnx>
"""
import glob
import math
import os
import sys
import time

import numpy as np
import onnx
import torch
import torch.nn as nn
import torch.nn.functional as F
from onnx import TensorProto, helper, numpy_helper

torch.manual_seed(0)
RNG = np.random.default_rng(0)
CROP = 48
BATCH = 32


class Student(nn.Module):
    def __init__(self, feat, body):
        super().__init__()
        layers = [nn.Conv2d(3, feat, 3, padding=1), nn.PReLU(feat)]
        for _ in range(body):
            layers += [nn.Conv2d(feat, feat, 3, padding=1), nn.PReLU(feat)]
        layers += [nn.Conv2d(feat, 3 * 4, 3, padding=1)]
        self.body = nn.Sequential(*layers)
        self.shuffle = nn.PixelShuffle(2)

    def forward(self, x):
        base = F.interpolate(x, scale_factor=2, mode="bilinear", align_corners=False)
        return self.shuffle(self.body(x)) + base


def load(data_dir):
    pairs = []
    for f in sorted(glob.glob(os.path.join(data_dir, "*.npz"))):
        d = np.load(f)
        if min(d["lr"].shape[:2]) >= CROP:
            pairs.append((d["lr"].astype(np.float32) / 255, d["hr"].astype(np.float32) / 255))
    return pairs


def batch(pairs):
    xs, ys = [], []
    for _ in range(BATCH):
        lr, hr = pairs[RNG.integers(len(pairs))]
        h, w = lr.shape[:2]
        y, x = RNG.integers(0, h - CROP + 1), RNG.integers(0, w - CROP + 1)
        a = lr[y:y + CROP, x:x + CROP]
        b = hr[2 * y:2 * (y + CROP), 2 * x:2 * (x + CROP)]
        k = RNG.integers(4)
        a, b = np.rot90(a, k), np.rot90(b, k)
        if RNG.random() < 0.5:
            a, b = a[:, ::-1], b[:, ::-1]
        xs.append(a.transpose(2, 0, 1).copy())
        ys.append(b.transpose(2, 0, 1).copy())
    return torch.from_numpy(np.stack(xs)), torch.from_numpy(np.stack(ys))


def export(model, feat, body, path):
    nodes, inits = [], []
    prev = "input"
    convs = [m for m in model.body if isinstance(m, nn.Conv2d)]
    prelus = [m for m in model.body if isinstance(m, nn.PReLU)]
    for i, conv in enumerate(convs):
        name = f"conv{i}"
        inits += [numpy_helper.from_array(conv.weight.detach().numpy(), f"{name}.w"),
                  numpy_helper.from_array(conv.bias.detach().numpy(), f"{name}.b")]
        nodes.append(helper.make_node("Conv", [prev, f"{name}.w", f"{name}.b"], [name],
                                      kernel_shape=[3, 3], pads=[1, 1, 1, 1]))
        prev = name
        if i < len(prelus):
            slope = prelus[i].weight.detach().numpy().reshape(-1, 1, 1)
            inits.append(numpy_helper.from_array(slope, f"act{i}.slope"))
            nodes.append(helper.make_node("PRelu", [prev, f"act{i}.slope"], [f"act{i}"]))
            prev = f"act{i}"
    nodes.append(helper.make_node("DepthToSpace", [prev], ["detail"], blocksize=2, mode="CRD"))
    inits.append(numpy_helper.from_array(np.array([1, 1, 2, 2], np.float32), "scales"))
    nodes.append(helper.make_node("Resize", ["input", "", "scales"], ["base"], mode="linear",
                                  coordinate_transformation_mode="half_pixel"))
    nodes.append(helper.make_node("Add", ["detail", "base"], ["output"]))
    graph = helper.make_graph(
        nodes, f"symps-fast-x2-f{feat}-b{body}",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, "h", "w"])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, "H", "W"])],
        inits)
    m = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)],
                          producer_name="symps-upscale distill")
    m.ir_version = 8
    m.doc_string = ("Symp's fast x2 model, trained by Symp's to imitate 4xLSDIRCompactC3 "
                    "by Philip Hofmann (CC BY 4.0).")
    m.metadata_props.add(key="scale", value="2")
    m.metadata_props.add(key="receptive_radius", value=str(len(convs)))
    onnx.checker.check_model(m)
    onnx.save(m, path)


def main(data_dir, feat, body, steps, out):
    feat, body, steps = int(feat), int(body), int(steps)
    torch.set_num_threads(os.cpu_count())
    pairs = load(data_dir)
    model = Student(feat, body)
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    sched = torch.optim.lr_scheduler.LambdaLR(
        opt, lambda s: 0.5 * (1 + math.cos(math.pi * min(s, steps) / steps)) * 0.995 + 0.005)
    # Borders of a crop see zero padding the real image never has; the app
    # mirror-pads instead, so they are left out of the loss.
    m = 2 * (body + 2)
    t0 = time.time()
    running = 0.0
    for step in range(1, steps + 1):
        x, y = batch(pairs)
        loss = F.l1_loss(model(x)[..., m:-m, m:-m], y[..., m:-m, m:-m])
        opt.zero_grad()
        loss.backward()
        opt.step()
        sched.step()
        running += loss.item()
        if step % 250 == 0:
            print(f"step {step}/{steps}  l1 {running / 250:.5f}  {time.time() - t0:.0f}s", flush=True)
            running = 0.0
    model.eval()
    export(model, feat, body, out)
    torch.save(model.state_dict(), out + ".pt")
    print("saved", out)


if __name__ == "__main__":
    main(*sys.argv[1:6])
