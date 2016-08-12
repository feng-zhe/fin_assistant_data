node {
    stage "checkout"
    checkout master

    stage "build"
    gitlabCommitStatus("build") {
        // your build steps
        echo 'this is from build stage'
    }

    stage "test"
    gitlabCommitStatus("test") {
        // your test steps
        echo 'this is from test stage'
    }
}
