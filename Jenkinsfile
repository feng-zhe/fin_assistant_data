node {
    stage "prerequisites"
    def nodeHome = tool 'node-4.4.7'

    stage "smoke-test"
    sh 'echo hello world'
    sh 'cat config.json'

    stage "build"
    sh 'echo this is from build stage'

    stage "pressure-test"
    echo 'this if pressure test'

    stage "deploy"
    sh 'node app.js'
}
