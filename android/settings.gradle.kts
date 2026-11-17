pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "symps-upscale-android"

// The upscaling itself is plain Kotlin on the JVM, so it is built and tested
// on its own, against the same ONNX Runtime API the app uses on the device.
include(":core")

// The app needs the Android SDK. A machine without one (no ANDROID_HOME and no
// local.properties) can still build and test :core.
if (System.getenv("ANDROID_HOME") != null ||
    System.getenv("ANDROID_SDK_ROOT") != null ||
    file("local.properties").exists()
) {
    include(":app")
}
