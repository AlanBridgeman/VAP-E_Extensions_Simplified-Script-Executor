import { Stream, TransformCallback } from 'stream';

import jschardet from 'jschardet';

import { InterpreterStreamTransform } from '../types/InterpreterStreamTransform';

/**
 * Trivial implementation of Stream.Transform to get output without having new 
 * lines (particularly with \r output) to compensate for update output (ex. 
 * MoviePy, etc...)
 */
export class PythonStreamTransform extends InterpreterStreamTransform {
    /**
     * Transform the chunk
     * 
     * @param chunk The chunk to transform
     * @param encoding The encoding of the chunk
     * @param callback The callback to call when done
     * 
     * @see https://nodejs.org/api/stream.html#transform_transformchunk-encoding-callback The function's documenation
     * @see https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream Implementing a Transform Stream
     * @see https://nodejs.org/api/stream.html#stream_class_stream_transform The Stream.Transform class documentation
     * 
     * @override
     */
    _transform(chunk: Buffer | string | any, encoding: BufferEncoding, callback: TransformCallback) {
        let data: string;

        if(chunk instanceof Buffer) {
            // For some reason the encoding parameter is set to `buffer` which makes no sense
            // So, we detect the encoding using jschardet ourselves instead.
            const buffer_encoding = jschardet.detect(chunk).encoding as BufferEncoding;
            
            // Now that we know the encoding we can convert the buffer to a string
            data = chunk.toString(buffer_encoding);
        }
        else if(typeof chunk === 'string')
            data = chunk;
        else
            data = chunk.toString();
        
        callback(null, data);
    }
    
    /**
     * Flush the stream
     * 
     * @param done The callback to call when done
     * 
     * @see https://nodejs.org/api/stream.html#stream_transform_flush_callback The function's documentation
     * @see https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream Implementing a Transform Stream
     * @see https://nodejs.org/api/stream.html#stream_class_stream_transform The Stream.Transform class documentation
     * 
     * @override
     */
    _flush(done: TransformCallback) {
        done();
    }
}