node {
    stage "smoke-test"
    sh 'echo hello world'
    sh 'cat config.json'

    stage "build"
    sh 'echo this is from build stage'

    stage "pressure-test"
    echo 'this if pressure test'
}
