import { PythonRunner } from './python/PythonRunner';

async function run(script: string = '__main__.py', repoDir: string = '.', scriptArgs: string[] = []) {
    console.debug(`Script: ${script}`);
    console.debug(`Repo Dir: ${repoDir}`);

    const uiCallback = (channel: string, ...args: any[]) => {
        console.log(`Channel: ${channel}`);
        console.log(`Args: ${args}`);
    }

    // Create a new PythonRunner object with a virtual environment (used to run the Python script)
    const pythonRunner = await PythonRunner.createWithVirtualEnv(repoDir, uiCallback, scriptArgs);

    var uiArgMap: { [key: string]: unknown } = undefined;
    if(process.env.includes('UI_ARGUMENTS_MAP')) {
        uiArgMap = JSON.parse(process.env.UI_ARGUMENTS_MAP);
    }

    // Run the Python script
    await pythonRunner.runScript(script, uiArgMap)
        .then(
            (result) => {
                console.log(`Final Result: ${result}`);
            }
        )
        .catch(
            (error) => {
                console.error(error);
                
                return { result: null, error: error };
            }
        );
}

run(process.argv.length > 2 ? process.argv[2] : '__main__.py', process.argv.length > 3 ? process.argv[3] : '.', process.argv.length > 4 ? process.argv[4].split(',') : []);