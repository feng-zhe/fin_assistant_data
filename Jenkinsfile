node {
    stage "prerequisites"
    def node = tool 'node-4.4.7'
    sh 'echo ${node}'
    sh 'npm install'

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
