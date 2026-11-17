plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.sympupscale.nail"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sympupscale.nail"
        // Android 5.0. Machines built around an Android board tend to run
        // whatever version the board shipped with, and rarely a recent one.
        minSdk = 21
        targetSdk = 35
        versionCode = 1
        versionName = "2.0.0"

        // ARM only: the boards these machines are built on. Each extra ABI
        // carries another copy of the ONNX Runtime library.
        ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a") }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Installed by hand on a machine, not through a store. Signed with
            // the build's debug key so the APK installs as is; see the README.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }

    androidResources {
        // Read whole into memory at start-up; no point compressing it.
        noCompress += "onnx"
    }
}

dependencies {
    implementation(project(":core"))
    implementation("com.microsoft.onnxruntime:onnxruntime-android:1.20.0")
    implementation("androidx.exifinterface:exifinterface:1.3.7")
}
