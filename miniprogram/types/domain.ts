export type Mood = '' | '开心' | '平静' | '疲惫' | '想你' | '需要抱抱' | '想独处';
export type AffectionKind = 'hug' | 'backPat' | 'headPat' | 'holdHands' | 'shoulderRub';
export interface Profile { mine: string; partner: string; anniversary: string; firstMet?: string; customHundredDate?: string; customYearDate?: string; cabinName: string; avatarMine?: string; avatarPartner?: string }
export interface MomentDraft { content: string; photo: string; privateNote: string; layout: string; savedAt: number; photo2?: string; stamp?: string; privateEnabled?: boolean; selectedTag?: string }
export interface LetterDraft { title: string; content: string; paper: number; delivery: 'now' | 'future'; openAt: string; savedAt: number }
export interface RecordItem { id:string; mine:boolean; createdAt:number; content?:string; title?:string; photos?:string[]; photoIds?:string[]; dayKey?:string; location?:string; weather?:string; caption?:string; openAt?:number; locked?:boolean; paper?:number; stamp?:string; favorite?:boolean; privateNote?:string }
export interface Wish {id:string;text:string;done:boolean;note?:string}
export interface Note {id:string;content:string;category:string}
export interface Ticket {train:string;from:string;to:string;date:string;departure:string;arrival:string;arrivalDate:string;seat:string;status:string}
export interface LocalSpace { profile: Profile; mood: Mood; moodNote: string; shareMood: boolean; hugs: number; affectionDay?:string; affectionCounts?:Partial<Record<AffectionKind,number>>; wishes: boolean[]; favorites: string[]; note: string; notes?:Note[]; meetingDate?:string; hugDay?:string; ticket?:Ticket|null; wishDetails?:Record<string,{text:string;note:string}> }
export interface SpaceSnapshot extends LocalSpace {bound:boolean;version:number;extraWishes:Wish[];partnerMood:string;partnerMoodKind?:Mood;moments:RecordItem[];letters:RecordItem[];stories:RecordItem[]}
