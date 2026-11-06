import type { Mood } from '../types/domain';
export const moodEmojis:Record<Mood,string> = {'':'','开心':'😊','平静':'😌','疲惫':'😴','想你':'🥰','需要抱抱':'🫂','想独处':'🌙'};
export function moodEmoji(value:string):string {return Object.hasOwnProperty.call(moodEmojis,value)?moodEmojis[value as Mood]:'';}
