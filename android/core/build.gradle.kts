import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("org.jetbrains.kotlin.jvm")
}

// Same release on both sides: the desktop artifact for the tests, the
// Android one in the app. Their Java API is one and the same.
val ortVersion = "1.20.0"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    // Provided by onnxruntime-android in the app; never packaged from here.
    compileOnly("com.microsoft.onnxruntime:onnxruntime:$ortVersion")
    testImplementation("com.microsoft.onnxruntime:onnxruntime:$ortVersion")
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
}

tasks.test {
    // The tests run the real models: the one the app ships, and the desktop
    // app's own, converted, which the shipped one was trained to imitate.
    systemProperty("app.model.path", rootProject.file("app/src/main/assets/upscale.onnx").absolutePath)
    systemProperty("desktop.model.path", rootProject.file("models/desktop-4xLSDIRCompactC3.onnx").absolutePath)
    maxHeapSize = "1g"
    testLogging { events("passed", "failed"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL }
}
