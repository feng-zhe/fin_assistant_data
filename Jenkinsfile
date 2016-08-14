node {
    stage "prerequisites"
    def nodeHome = tool 'node-4.4.7'
    sh "${nodeHome}/bin/npm install"

    stage "smoke-test"
    sh "echo hello world"
    sh "cat config.json"

    stage "build"
    sh "echo this is from build stage"

    stage "pressure-test"
    echo "this if pressure test"

    stage "deploy"
    sh "${nodeHome}/bin/node app.js"
}
