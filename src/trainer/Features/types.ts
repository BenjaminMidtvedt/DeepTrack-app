export type entity = [
    string,
    {
        class: "module" | "function" | "property" | "feature";
        signature: String;
        value: String;
    }
];
