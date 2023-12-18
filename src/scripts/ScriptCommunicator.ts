import path from 'path';

import { PythonShell } from 'python-shell';

//import { PythonStreamTransform } from './PythonStreamTransform';
import { ScriptResponder } from './ScriptResponder';

import { Interpreter } from '../types/Interpreter';
import { InterpreterOptions } from '../types/InterpreterOptions';
import { InterpreterError } from '../types/InterpreterError';
import { InterpreterClass } from '../types/InterpreterClass';
import { InterpreterStreamTransform } from '../types/InterpreterStreamTransform';

/**
 * The ScriptCommunicator class acts as a bit of a intermediary between the
 * GUI and logic scripts/code. 
 * 
 * That is, it handles the "low level" details needed for communicating between the GUI and the logic layer: 
 * - Initial setup of the actual communication objects. Such as: an interpreter (PythonShell) object, MyStream objects, etc...
 * - Cleanup of the communication objects. Such as: the scripts interpreter (PythonShell), MyStream objects, etc...
 * 
 * @see ScriptResponder for the "API" level communication (in terms of what prompts trigger what messages/actions, etc...)
 */
export class ScriptCommunicator {
    /**
     * The script file that will be run
     */
    private script: string;

    /**
     * The interpreter options (ex. PythonShell options)
     */
    private interpreterOptions: InterpreterOptions;

    /**
     * The stream transformer (used to handle messages from the script's stdout and stderr)
     */
    private streamTransformer?: InterpreterStreamTransform;

    /**
     * Function to be able to send messages back to the UI (React)/the Renderer
     */
    private sendUIMessage: (channel: string, ...args: any[]) => void;

    /**
     * Create a new ScriptCommunicator object
     * 
     * @param script The script file that will be run
     * @param interpreterOptions The interpreter options (ex. PythonShell options)
     * @param sendUIMessage Function to be able to send messages back to the UI (React)/the Renderer
     */
    constructor(script: string, interpreterOptions: InterpreterOptions, sendUIMessage: (channel: string, ...args: any[]) => void, InterpreterStreamTransformClass?: new(...args: any[]) => InterpreterStreamTransform) {
        this.script = script;
        this.interpreterOptions = interpreterOptions;
        this.sendUIMessage = sendUIMessage;

        if(InterpreterStreamTransformClass) {
            // Create a new stream transformer
            this.streamTransformer = new InterpreterStreamTransformClass();
        }
    }

    /**
     * Function to actually run and communicate with the script
     * 
     * This is mostly a wrapper for the ScriptResponder class (which handles
     * the actual communication in a more "API" like way, that is, it handles what
     * message is given in response to what prompt, etc...)
     * 
     * Though, this function handles some of the surrounding details such as:
     * - Initial setup of the interpreter (PythonShell) object (which also spawns the process),
     * - Cleanup (including making sure the script process is terminated)
     * 
     * @param InterpreterClass The class to use to create the interpreter object. ex. PythonShell
     * @param uiArgumentMap The arguments (keyed by name using the metadata file) that were passed when the UI (React) callback was called
     * @param resolve The function to call when the script is done running
     * @param reject The function to call if there is an error
     */
    run(InterpreterClass: InterpreterClass, uiArgumentMap: { [argName: string]: unknown }, resolve: (result?: unknown) => any, reject: (reason?: any) => void) {
        var logicMessages: string[] = [];

        // Get the responses
        const messageResponses = require(path.resolve(process.cwd(), '../responses.js'));

        console.log(`Message Responses: ${JSON.stringify(messageResponses)}`)

        let interpreter: Interpreter;
        
        // Note, we wrap the spawning of the interpreter (PythonShell) in a Promise so that when resolved or rejected, 
        // we can know that the script execution will be terminated and we can do any needed cleanup
        new Promise(
            (resolve, reject) => {
                if (this.script.includes(path.sep)) {
                    // Change directories to the directory above the directory with the script (this is because to call modules you need to give a name which is the directory name)
                    process.chdir(path.dirname(path.dirname(this.script)))

                    // Debug statement to show the directory after the change
                    console.debug(`Working Directory: ${process.cwd()}`);

                    // If the path to the python interpreter is relative, particularly with a parent directory indicator (ex. ../), we need to adjust the path
                    // TODO: Improve this to work more generally (ex. if the path is relative, adjust appropriately based on the change in directory)
                    if (this.interpreterOptions.pythonPath.includes('..\\') || this.interpreterOptions.pythonPath.includes('../')) {
                        if (process.platform === 'win32') {
                            this.interpreterOptions.pythonPath = this.interpreterOptions.pythonPath.replace('..\\', '');
                        }
                        else {
                            this.interpreterOptions.pythonPath = this.interpreterOptions.pythonPath.replace('../', '');
                        }
                    }

                    // The script becomes the name of the directory with the script (again, this is to compensate for modules)
                    this.script = path.dirname(this.script).substring(path.dirname(this.script).lastIndexOf(path.sep) + 1);
                }

                if(typeof this.streamTransformer !== 'undefined') {
                    interpreter = new InterpreterClass(
                        this.script, 
                        this.interpreterOptions,        // Python interpreter options (use virtual environment, etc...)
                        this.streamTransformer,         // Use a custom stdoutSplitter
                        this.streamTransformer          // Use a custom stderrSplitter
                    )
                }
                else {
                    interpreter = new InterpreterClass(
                        this.script,
                        this.interpreterOptions
                    );
                }

                /**
                 * Handle any explicit errors provided by PythonShell ('error' or 'pythonError' events)
                 * 
                 * @param err The error that occurred
                 */
                const onError = (err: NodeJS.ErrnoException) => {
                    reject(err);
                };
                
                // If an error occurs, reject the promise (which will kill the script and pass the error back up the stack)
                interpreter.on('error', onError);
                
                if(InterpreterClass === PythonShell) {
                    // If a pythonError occurs, reject the promise (which will kill the python script and pass the error back up the stack)
                    interpreter.on('pythonError', onError);
                }

                
                const sendLogicMessage: (message: string | Object) => Interpreter = (message: string | Object): Interpreter => { 
                    console.log(`Logic Message (response): ${JSON.stringify(message)}`); 
                    return interpreter.send(message);
                    //interpreter.send.bind(interpreter); 
                };

                // Create a Responder (used to handle responses from the script)
                const responder = new ScriptResponder(
                    messageResponses, 
                    sendLogicMessage, 
                    uiArgumentMap, 
                    logicMessages, 
                    this.sendUIMessage, 
                    resolve, 
                    reject
                );
                
                // Handle any output on stdout
                interpreter.on('message', 
                    (message: string) => {
                        responder.respondToMessage(message);
                    }
                );
            }
        )
            .then(
                (result: unknown) => {
                    // If the python script hasn't already stopped, wait for it to end (gracefully stop it)
                    if(!interpreter.terminated) {
                        // Close stdin and wait for the process to exit (gracefully stop it)
                        interpreter.end(
                            (err: InterpreterError, exitCode, exitSignal) => {
                                // Check if an error occurred while waiting for graceful exit
                                if (err) {
                                    // Write the error to the console (for debugging)
                                    console.error(`An error occurred while waiting for graceful exit: ${err.message}`);
                                    
                                    // Reject the larger python callback promise (with the provided error as the reason)
                                    reject(err);
                                }
                                
                                // Resolve the larger python callback promise
                                resolve(result);
                            }
                        );
                    }
                }
            )
            .catch(
                (err) => {
                    // Write the error to the console (for debugging)
                    console.error(`An error occurred while spawning and executing python: ${err.message}`);

                    // Kill the Python script if it hasn't already stopped (because some kind of error has seemed to occur)
                    // Note, this could be because of an error with the process/interpreter or if the extension indicated an error for some reason.
                    if(!interpreter.terminated) {
                        interpreter.kill();
                    }

                    // Reject the larger python callback promise (with the provided error as the reason)
                    reject(err);
                }
            );
    }
}