'use server';
/**
 * @fileOverview A Genkit flow to convert text to speech using a Gemini model.
 * It takes text and a speaker role, maps the role to a specific prebuilt voice,
 * generates the audio, and returns it as a Base64-encoded WAV file.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';
import wav from 'wav';
import { SpeakerSchema } from '@/lib/simulation-types';

const GenerateSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
  speaker: SpeakerSchema.describe('The role of the speaker, used to select a voice.'),
});
export type GenerateSpeechInput = z.infer<typeof GenerateSpeechInputSchema>;

const GenerateSpeechOutputSchema = z.object({
  audioContent: z.string().describe('Base64-encoded WAV audio content as a data URI.'),
});
export type GenerateSpeechOutput = z.infer<typeof GenerateSpeechOutputSchema>;

// Asynchronously converts raw PCM audio data to a Base64-encoded WAV string.
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (chunk) => bufs.push(chunk));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

// Maps speaker roles to specific prebuilt voice names for characterization.
const voiceMap: Record<string, string> = {
  TRIBUNAL: 'Achernar', // A deep, authoritative voice.
  OPPOSING_COUNSEL: 'Algenib', // An assertive voice.
  COACHING: 'Enif', // A friendly, clear voice.
  WITNESS: 'Mirfak', // A neutral voice.
  DEFAULT: 'Enif',
};

export async function generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechOutput> {
  return generateSpeechFlow(input);
}

const generateSpeechFlow = ai.defineFlow(
  {
    name: 'generateSpeechFlow',
    inputSchema: GenerateSpeechInputSchema,
    outputSchema: GenerateSpeechOutputSchema,
  },
  async ({ text, speaker }) => {
    const voiceName = voiceMap[speaker] || voiceMap.DEFAULT;

    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      prompt: text,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    if (!media?.url) {
      throw new Error('AI did not return audio media.');
    }

    // Extract the Base64 part of the PCM data URI.
    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    
    // Convert PCM to WAV format.
    const wavBase64 = await toWav(audioBuffer);

    return {
      audioContent: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);
