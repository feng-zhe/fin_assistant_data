node {
    stage "prerequisites"
    git url: "/home/git/projects/fin_assistant_data.git"
    def nodeHome = tool 'node-lt'
    sh "${nodeHome}/bin/npm install"

    stage "build"
    echo "TODO: this is the build stage"

    stage "smoke-test"
    sh "${nodeHome}/bin/node update.js"
    sh "${nodeHome}/bin/node post-update.js"

    stage "deploy"
    echo "TODO: this is the deploy phase"
}
