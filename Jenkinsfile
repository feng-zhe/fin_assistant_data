node {
    stage "smoke-test"
    git url: "git@dev.mathitfans.com:projects/fin_assistant_data.git"

    stage "build"
    sh 'echo this is from build stage'

    stage "pressure-test"
    echo 'this if pressure test'
}
