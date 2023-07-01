import { PythonRunner } from './python/PythonRunner';

async function run(script: string = '__main__.py', repoDir: string = '.', scriptArgs: string[] = []) {

    const uiCallback = (channel: string, ...args: any[]) => {
        console.log(`Channel: ${channel}`);
        console.log(`Args: ${args}`);
    }

    // Create a new PythonRunner object with a virtual environment (used to run the Python script)
    const pythonRunner = await PythonRunner.createWithVirtualEnv(repoDir, uiCallback, scriptArgs);

    // Run the Python script
    await pythonRunner.runScript(script)
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

run(process.argv.length > 0 ? process.argv[0] : '__main__.py', process.argv.length > 1 ? process.argv[1] : '.', process.argv.length > 2 ? process.argv[2].split(',') : []);