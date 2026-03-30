
export interface ResponseQuestDate {
    _id:        string;
    status:     string;
    __v:        number;
    createdAt:  Date;
    end_date:   Date;
    start_date: Date;
    updatedAt:  Date;
    facebook_page: string;
    facebook_post: string;
    line: string;
    banner_en: string;
    banner_th: string;
    sub_banner_en: string;
    sub_banner_th: string;
}

export interface ResponseQuestCreateForm {
    start_date: string;
    end_date:   string;
    facebook_page: string;
    facebook_post: string;
    line: string;
    banner_en: File | string;
    banner_th: File | string;
    sub_banner_en: File | string;
    sub_banner_th: File | string;
}
