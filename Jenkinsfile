node {
    stage "prerequisites"
    def nodeHome = tool 'node-4.4.7'
    sh "rm -rf node_modules"
    sh "${nodeHome}/bin/npm install"

    stage "smoke-test"
    sh "echo hello world"
    sh "cat config.json"

    stage "build"
    sh "echo this is from build stage"

    stage "pressure-test"
    echo "this if pressure test"

    stage "deploy"
    env.NODE_PATH = "./node_modules"
    sh "${nodeHome}/bin/node app.js"
}
