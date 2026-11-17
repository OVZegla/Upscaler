// Plugins go on the root classpath, so the Kotlin plugin and the Android one
// see each other. The Android plugin is only fetched when the app is part of
// the build: without an SDK, :core still builds and tests on its own.
buildscript {
    val withApp = project.findProject(":app") != null
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21")
        if (withApp) classpath("com.android.tools.build:gradle:8.7.3")
    }
}
