export type oid = "A"|"B"|"C"|"D"|"E"

interface analysis {
    point: string | null,
    discuss: string | null,
    link: string[]
}

export interface A1 {
    type: "A1";
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid;
    analysis: analysis;
}

export interface A2 {
    type: "A2";
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid;
    analysis: analysis;
}
export interface A3 {
    type: "A3";
    mainQuestion: string;
    subQuizs: {
        subQuizId: number;
        question: string;
        options: {oid: oid, text: string}[];
        answer: oid
    }[]
    analysis: analysis;
}

export interface X {
    type: "X";
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid[];
    analysis: analysis;
}

export interface B {
    type: "B";
    questions: {
        questionId: number;
        questionText: string;
        answer: oid
    }[];
    options: {oid: oid, text: string}[];
    analysis: analysis;
}