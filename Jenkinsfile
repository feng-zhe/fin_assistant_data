node {
    stage "prerequisites"
    git url: "/home/git/projects/fin_assistant_data.git"
    def nodeHome = tool 'node-4.4.7'
    sh "${nodeHome}/bin/npm install"

    stage "build"
    echo "TODO: this is the build stage"

    stage "smoke-test"
    sh "${nodeHome}/bin/node app.js"

    stage "deploy"
    echo "TODO: this is the deploy phase"
}
