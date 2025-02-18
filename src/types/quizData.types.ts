export type oid = "A"|"B"|"C"|"D"|"E"

interface analysis {
    point: string | null,
    discuss: string | null,
    link: string[]
}

export interface A1 {
    type: "A1";
    class: string;
    unit: string;
    tags: string[];
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid;
    analysis: analysis;
}

export interface A2 {
    type: "A2";
    class: string;
    unit: string;
    tags: string[];
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid;
    analysis: analysis;
}
export interface A3 {
    type: "A3";
    class: string;
    unit: string;
    tags: string[];
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
    class: string;
    unit: string;
    tags: string[];
    question: string;
    options: {oid: oid, text: string}[];
    answer: oid[];
    analysis: analysis;
}

export interface B {
    type: "B";
    class: string;
    unit: string;
    tags: string[];
    questions: {
        questionId: number;
        questionText: string;
        answer: oid
    }[];
    options: {oid: oid, text: string}[];
    analysis: analysis;
}