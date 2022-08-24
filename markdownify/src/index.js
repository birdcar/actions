const github = require('@actions/github');

async function run() {
  console.log(github.context)
  console.log(github.context.payload)
}

run();
