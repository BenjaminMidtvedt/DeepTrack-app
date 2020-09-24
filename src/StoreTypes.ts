export interface StoreItem {
    class: "root" | "featureGroup" | "feature" | "property";
    items: number[];
    index: number;
    value?: string;
    S?: boolean | string;
    V?: boolean | string;
    T?: boolean | string;
    L?: boolean | string;
    type?: string;
    name: string;
    key?: string;
}
