# ONNX Runtime's Java classes are reached from its native library by name.
-keep class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**
