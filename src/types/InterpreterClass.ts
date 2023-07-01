import { InterpreterStreamTransform } from "./InterpreterStreamTransform";
import { InterpreterOptions } from "./InterpreterOptions";
import { Interpreter } from "./Interpreter";

export type InterpreterClass = new (scriptPath: string, options?: InterpreterOptions, stdoutSplitter?: InterpreterStreamTransform, stderrSplitter?: InterpreterStreamTransform) => Interpreter;