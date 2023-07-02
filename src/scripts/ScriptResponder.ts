import { PythonShell } from 'python-shell';

import { ResponseCallback } from '../types/ResponseCallback';
import { Interpreter } from '../types/Interpreter';

/**
 * The ScriptResponder class is used to handle the "API" level of communication with scripts.
 * That is, it handles what action is taken in response to what prompt, etc...
 */
export class ScriptResponder {
    /**
     * Callback to send a message to the interpreter (PythonShell)
     * In other words, callback used to communicate with the script
     */
    private sendLogicMessage: (message: string | Object) => Interpreter;

    /**
     * The list of messages that have been received from the logic layer (script such as Python) so far
     */
    private logicMessages: string[];

    /**
     * Function to be able to send messages back to the UI (React)/the Renderer
     */
    private sendUIMessage: (channel: string, ...args: any[]) => void;

    /**
     * A dictionary/map of message/callback pairs
     * 
     * Note, this may include a "_default" key, which is used for any messages that don't have a specific response
     */
    private messageResponses: { [message: string]: ResponseCallback };

    /**
     * The arguments (keyed by name using the metadata file) that were passed when the UI (React) callback was called
     */
    private uiArgumentMap: { [argName: string]: unknown };

    /**
     * The resolve function (used to resolve the Python process related promise, that is when we are done communicating/running the Python script)
     * 
     * Note, when called this then triggers the then callback defined in the PythonCommunicator class which attempts, if the script is still running, 
     * to gracefully shutdown the Python process (by closing stdin)
     */
    private resolve: (result?: unknown) => any;

    /**
     * The reject function (used to reject the Python process related promise, indicating an error occured during python execution in some way)
     */
    private reject: (reason?: any) => void;

    private readonly EXITING_MESSAGE = 'Exiting...';

    constructor(
        messageResponses: { [message: string]: ResponseCallback },
        sendLogicMessage: (message: string | Object) => PythonShell, 
        uiArgumentMap: { [argName: string]: unknown }, 
        logicMessages: string[], 
        sendUIMessage: (channel: string, ...args: any[]) => void, 
        resolve: (result?: unknown) => any, 
        reject: (reason?: any) => void
    ) {
        this.messageResponses = messageResponses;
        this.sendLogicMessage = sendLogicMessage;
        this.uiArgumentMap = uiArgumentMap;
        this.logicMessages = logicMessages;
        this.sendUIMessage = sendUIMessage;
        this.resolve = resolve;
        this.reject = reject;
    }

    private handleExitingMessage(message: string) {
        if(message.trim() == this.EXITING_MESSAGE) {
            console.log('Exiting message recieved');

            // Resolve the promise (which will trigger the then callback in the PythonCommunicator class)
            this.resolve();

            return true;
        }

        return false;
    }

    /**
     * Attempt to handle the response from the logic layer (Python) script based on responses 
     * provided by the extension
     * 
     * @param {string} messsage The message to handle
     * @returns {boolean} Whether or not the message was handled
     */
    handleResponse(message: string) {
        var handled = false;

        const prompts = Object.keys(this.messageResponses);

        // Loop through all the available prompt/response pairs provided
        for(var i=0;i < prompts.length;i++) {
            // Get the current prompt
            var currPrompt = prompts[i];

            // We want to exclude the "_default" fallback prompt
            if(currPrompt != '_default') {
                // Get the current prompt as regular expression to test against (because it may be a regex)
                var promptRegex = new RegExp(currPrompt);
                
                // If the message matches the current prompt (as a regex or exact matched string)
                if(promptRegex.test(message) || currPrompt === message.trim()) {
                    // Use the message mapping to get the proper callback function to call
                    var responseCallback = this.messageResponses[currPrompt];

                    // Call the callback function
                    responseCallback(message, this.sendLogicMessage, this.uiArgumentMap, this.logicMessages, this.sendUIMessage, this.resolve, this.reject);

                    // Set the handled flag to true so that we don't use the default response on the message
                    handled = true;
                }
            }
        }

        return handled;
    }

    /**
     * Generic wrapper that handles ALL messages including ones that require the 
     * extension's default response
     * 
     * @param {string} message The message to handle 
     */
    respondToMessage(message: string) {
        if(message.trim().includes('\n')) {
            message.trim().split('\n').forEach((msg) => this.respondToMessage(msg));
            return;
        }
        
        console.debug('Message recieved: ' + message)

        // Handle the exiting message (which is the last message sent by the Python script)
        const hasExited = this.handleExitingMessage(message);

        // Only handle the message if it hasn't been handled by the exiting message handler
        if(!hasExited) {
            // Check if the message matches any of the extension's responses
            var usedResponse = this.handleResponse(message)

            // Because the handleExtensionResponse function returned false (meaning it didn't trigger any of the extension's responses) 
            // we want to use the default callback (if it exists)
            if(!usedResponse) {
                if('_default' in this.messageResponses) {
                    this.messageResponses._default(message, this.sendLogicMessage, this.uiArgumentMap, this.logicMessages, this.sendUIMessage, this.resolve, this.reject);
                }
            }
        }
        
        // Add the message to the already recieved messages (logicMessages) array
        this.logicMessages.push(message);
    }
}