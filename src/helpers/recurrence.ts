import { SessionRecurrenceEnum } from '../interfaces/session';

export const computerDatesByRecurrence = (startDate: Date, recurrence: SessionRecurrenceEnum, seriesLengthInDays: number): Date[] => {
	const endDate = new Date(new Date(startDate).getTime() + seriesLengthInDays * 24 * 60 * 60 * 1000);

	let computedDate = new Date(startDate);
	const computedDates: Date[] = [new Date(computedDate)];

	while (computedDate < endDate) {
		switch (recurrence) {
			case SessionRecurrenceEnum.DAILY:
				computedDate = new Date(computedDate.getTime() + 24 * 60 * 60 * 1000);
				computedDates.push(new Date(computedDate));
				break;
			case SessionRecurrenceEnum.WEEKDAYS:
				computedDate = new Date(computedDate.getTime() + 24 * 60 * 60 * 1000);
				if (![0, 6].includes(computedDate.getDay())) {
					computedDates.push(new Date(computedDate));
				}
				break;
			case SessionRecurrenceEnum.WEEKLY:
				computedDate = new Date(computedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
				computedDates.push(new Date(computedDate));
				break;
			case SessionRecurrenceEnum.MONTHLY:
				computedDate = new Date(computedDate.setMonth(computedDate.getMonth() + 1));
				computedDates.push(new Date(computedDate));
				break;
		}
	}

	return computedDates;
};
