import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

/**
 * Configure AWS Amplify for March Madness Squares application
 */
Amplify.configure(outputs);

export default outputs;