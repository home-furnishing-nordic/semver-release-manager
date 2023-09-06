const {context, GitHub} = require('@actions/github');
const core = require('@actions/core');

async function run() {
    try {
        const token = core.getInput('github_token', {required: true});
        const repo = context.repo.repo;
        const owner = context.repo.owner;
        const time = (new Date()).toISOString();
        const {GITHUB_REF, GITHUB_SHA} = process.env;

        if (!GITHUB_REF) {
            core.setFailed("Missing GITHUB_REF");
            return;
        }

        if (!GITHUB_SHA) {
            core.setFailed("Missing GITHUB_SHA");
            return;
        }
        console.log("Initialising github interface");
        const octokit = new GitHub(token);

        console.log(`Github initialised; Start generating tag`);
        const {lastTag, newTag, preRelease} = await generateTag(octokit, repo, owner);

        console.log(`Start fetching commits`);
        const {data: commits} = await octokit.repos.listCommits({
            owner,
            repo,
        });

        const message = getMessage(commits, lastTag);

        console.log(`Creating Tag: ${newTag}`);
        const tag = await octokit.git.createTag({
            ...context.repo,
            tag: newTag,
            object: GITHUB_SHA,
            message: message,
            type: 'commit',
            tagger: {
                name: context.payload.pusher.name,
                email: context.payload.pusher.email,
                date: time,
            }
        });

        console.log(`Creating reference for Tag: ${newTag}`);
        await octokit.git.createRef({
            ...context.repo,
            ref: `refs/tags/${newTag}`,
            sha: tag.data.sha,
        });

        console.log(`Creating release with Tag: ${newTag}`);
        await octokit.repos.createRelease({
            owner,
            repo,
            tag_name: newTag,
            name: newTag,
            body: message,
            prerelease: preRelease,
        });

        core.setOutput("new_tag", newTag);
        core.setOutput("time", time);
    } catch (error) {
        core.setFailed(error.message);
    }
}

function getMessage(commits, lastTag) {
    console.log('Generating message');

    const commitMessages = [];

    for (let i = 0; i < commits.length; i++) {
        const c = commits[i];

        if (c.sha === lastTag.commit.sha) {
            break;
        }

        const message = c.commit.message;

        if (message.startsWith('Merge', 0)) {
            continue;
        }

        commitMessages.push('#### ' + message);
    }

    return commitMessages.join("\n");
}

function bumpVersionTokens(tokens, type = null) {
    if (!tokens instanceof Array) {
        throw new Error('Bumps only array tokens');
    }

    if (typeof tokens[0] == "undefined") {
        throw new Error('Major token undefined')
    }

    if (typeof tokens[1] == "undefined") {
        tokens[1] = 0;
    }

    if (typeof tokens[2] == "undefined") {
        tokens[2] = 0;
    }

    const defaultType = core.getInput('bump_type');
    if (!['major', 'minor', 'patch', 'none'].includes(defaultType)) {
        throw new Error('Invalid default bump type')
    }

    switch (type) {
        case 'major':
            tokens[0] = 1 + parseInt(tokens[0]);
            tokens[1] = 0;
            tokens[2] = 0;

            break;
        case 'minor':
            tokens[1] = 1 + parseInt(tokens[1]);
            tokens[2] = 0;

            break;
        case 'patch':
            tokens[2] = 1 + parseInt(tokens[2]);

            break;
        case 'none':
            break
        default:
            return bumpVersionTokens(tokens, defaultType);
    }

    console.log('Bumping version. Selected type: ' + type);

    return tokens;
}

async function generateTag(octokit, repo, owner) {
    console.log('Retrieve list of tags');
    const {data: listTags} = await octokit.repos.listTags({
        owner,
        repo,
    });

    let defaultTag = null;
    let lastTag = listTags[0];

    //init first tag
    if (!lastTag) {
        defaultTag = core.getInput('start_from_version');
        lastTag = {
            name: defaultTag,
            commit: {
                sha: null,
            }
        };
        console.log('There are no tags found, using init tag: ' + defaultTag);
    } else {
        console.log('Last tag info received: ' + lastTag.name);
    }

    let dirtname = lastTag.name;
    if (dirtname.startsWith('v', 0)) {
        //removing 'v' symbol
        dirtname = dirtname.substring(1);
    }

    try {
        let bumpType = context.payload.head_commit.message.match(/\#release-\w+/gm);
    } catch (e) {
        console.log("ERROR: The event data given to the action by Github didn't contain `head_commit`. This action should only be used on pull requests.");
        throw e;
    }
    if (bumpType instanceof Array) {
        //remove #release-  part
        bumpType = bumpType[0].substring(9);
    }

    let tokens = dirtname.split('.');
    // bump tag version
    if (!defaultTag) {
        const tokens = bumpVersionTokens(dirtname.split('.'), bumpType);
    }

    // check first symbol after v in
    const preRelease = '0' === tokens[0];
    const newTag = 'v' + tokens.join('.');

    console.log('New tag is: ' + newTag);
    return {
        preRelease,
        newTag,
        lastTag,
    }
}

console.log("Start up recieved");
run();
