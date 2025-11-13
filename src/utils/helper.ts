async function convertToUSD(
  currency: string,
  amount: number,
): Promise<{ usdAmount: number | null; exchangeRate: number | null }> {
  if (currency === 'USD') {
    return { usdAmount: amount, exchangeRate: 1 };
  }

  try {
    // Using a free currency conversion API (you can replace with your preferred service)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${currency}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate for ${currency}`);
    }

    const data = await response.json();
    const exchangeRate = data.rates.USD;

    if (!exchangeRate) {
      throw new Error(`USD exchange rate not found for ${currency}`);
    }

    return { usdAmount: amount * exchangeRate, exchangeRate };
  } catch (error) {
    console.error(`Error converting ${currency} to USD:`, error);
    return { usdAmount: null, exchangeRate: null };
  }
}

const thaiBanks = [
  {
    code: '002',
    shortName: 'BBL',
    nameEn: 'Bangkok Bank',
    nameTh: 'ธนาคารกรุงเทพ',
  },
  {
    code: '004',
    shortName: 'KBANK',
    nameEn: 'Kasikornbank',
    nameTh: 'ธนาคารกสิกรไทย',
  },
  {
    code: '006',
    shortName: 'KTB',
    nameEn: 'Krungthai Bank',
    nameTh: 'ธนาคารกรุงไทย',
  },
  {
    code: '011',
    shortName: 'TTB',
    nameEn: 'TMBThanachart Bank',
    nameTh: 'ธนาคารทหารไทยธนชาต',
  },
  {
    code: '014',
    shortName: 'SCB',
    nameEn: 'Siam Commercial Bank',
    nameTh: 'ธนาคารไทยพาณิชย์',
  },
  {
    code: '025',
    shortName: 'BAY',
    nameEn: 'Bank of Ayudhya (Krungsri)',
    nameTh: 'ธนาคารกรุงศรีอยุธยา',
  },
  {
    code: '030',
    shortName: 'GSB',
    nameEn: 'Government Savings Bank',
    nameTh: 'ธนาคารออมสิน',
  },
  {
    code: '034',
    shortName: 'BAAC',
    nameEn: 'Bank for Agriculture and Agricultural Cooperatives',
    nameTh: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร',
  },
  {
    code: '066',
    shortName: 'ISBT',
    nameEn: 'Islamic Bank of Thailand',
    nameTh: 'ธนาคารอิสลามแห่งประเทศไทย',
  },
  {
    code: '069',
    shortName: 'SMEB',
    nameEn: 'SME Development Bank',
    nameTh: 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย',
  },
  {
    code: '067',
    shortName: 'CIMBT',
    nameEn: 'CIMB Thai Bank',
    nameTh: 'ธนาคารซีไอเอ็มบีไทย',
  },
  {
    code: '068',
    shortName: 'UOBT',
    nameEn: 'United Overseas Bank (Thai)',
    nameTh: 'ธนาคารยูโอบี',
  },
  {
    code: '070',
    shortName: 'LHFG',
    nameEn: 'Land and Houses Bank',
    nameTh: 'ธนาคารแลนด์ แอนด์ เฮ้าส์',
  },
  {
    code: '071',
    shortName: 'TTI',
    nameEn: 'TISCO Bank',
    nameTh: 'ธนาคารทิสโก้',
  },
  {
    code: '073',
    shortName: 'KKP',
    nameEn: 'Kiatnakin Phatra Bank',
    nameTh: 'ธนาคารเกียรตินาคินภัทร',
  },
];
export { convertToUSD, thaiBanks };
