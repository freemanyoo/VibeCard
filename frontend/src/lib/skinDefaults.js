/**
 * 스킨/디자인·청첩장 만들기·메인(초대장)에서 동일한 글자 크기·비율을 쓰기 위한 기본값.
 * 디자인·Builder·InvitationView에서 이 값을 기준으로 매칭.
 */
export const TYPO_DEFAULTS = {
  modern: {
    titleSize: 38, namesSize: 30, dateSize: 13, heroWeekdaySize: 13, heroTimeSize: 13, saveTheDateSize: 9, contentSize: 17,
    heroVenueNameSize: 18, heroDDaySize: 10,
    familyLineSize: 16, familyRelationSize: 10,
    calendarTitleSize: 28, calendarWeekdaySize: 11, calendarDaySize: 13,
    galleryTitleSize: 10, locationTitleSize: 10, accountTitleSize: 10, attendanceTitleSize: 10,
    locationVenueNameSize: 30, locationAddressSize: 14, navButtonTextSize: 9,
    accountSubtitleSize: 12, bankNameSize: 10, copyButtonTextSize: 9, accountHeaderSize: 10, accountInfoSize: 20, accountToggleLabelSize: 11,
    attendanceDescSize: 12, guestbookTitleSize: 10, guestbookDescSize: 12, attendanceLabelSize: 11, attendanceOptionTextSize: 12, formPlaceholderSize: 14,
    footerWeddingOfSize: 10,
  },
  elegant: {
    titleSize: 38, namesSize: 32, dateSize: 14, heroWeekdaySize: 14, heroTimeSize: 14, saveTheDateSize: 10, contentSize: 17,
    heroVenueNameSize: 18, heroDDaySize: 10,
    familyLineSize: 16, familyRelationSize: 10,
    calendarTitleSize: 30, calendarWeekdaySize: 11, calendarDaySize: 13,
    galleryTitleSize: 10, locationTitleSize: 10, accountTitleSize: 10, attendanceTitleSize: 10,
    locationVenueNameSize: 30, locationAddressSize: 14, navButtonTextSize: 9,
    accountSubtitleSize: 12, bankNameSize: 10, copyButtonTextSize: 9, accountHeaderSize: 10, accountInfoSize: 20, accountToggleLabelSize: 11,
    attendanceDescSize: 12, guestbookTitleSize: 10, guestbookDescSize: 12, attendanceLabelSize: 11, attendanceOptionTextSize: 12, formPlaceholderSize: 14,
    footerWeddingOfSize: 10,
  },
  classic: {
    titleSize: 32, namesSize: 26, dateSize: 14, heroWeekdaySize: 14, heroTimeSize: 14, saveTheDateSize: 9, contentSize: 16,
    heroVenueNameSize: 18, heroDDaySize: 10,
    familyLineSize: 16, familyRelationSize: 10,
    calendarTitleSize: 28, calendarWeekdaySize: 11, calendarDaySize: 13,
    galleryTitleSize: 10, locationTitleSize: 10, accountTitleSize: 10, attendanceTitleSize: 10,
    locationVenueNameSize: 30, locationAddressSize: 14, navButtonTextSize: 9,
    accountSubtitleSize: 12, bankNameSize: 10, copyButtonTextSize: 9, accountHeaderSize: 10, accountInfoSize: 20, accountToggleLabelSize: 11,
    attendanceDescSize: 12, guestbookTitleSize: 10, guestbookDescSize: 12, attendanceLabelSize: 11, attendanceOptionTextSize: 12, formPlaceholderSize: 14,
    footerWeddingOfSize: 10,
  },
};

export function getTypoForTemplate(template) {
  return TYPO_DEFAULTS[template] || TYPO_DEFAULTS.modern;
}
