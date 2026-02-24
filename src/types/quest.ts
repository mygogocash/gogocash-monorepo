
export interface ResponseQuestDate {
    _id:        string;
    status:     string;
    __v:        number;
    createdAt:  Date;
    end_date:   Date;
    start_date: Date;
    updatedAt:  Date;
}

export interface ResponseQuestCreateForm {
    start_date: string;
    end_date:   string;
}
