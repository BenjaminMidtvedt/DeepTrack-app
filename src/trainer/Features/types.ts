export type entity = [
    string,
    {
        class: "module" | "function" | "property" | "feature";
        signature: String;
        S?: String;
    }
];
