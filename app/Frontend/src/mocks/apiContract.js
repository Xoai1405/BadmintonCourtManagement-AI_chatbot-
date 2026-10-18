export const generateTimeSlots = () => {
  const slots = [];

  const toTime = (totalMinutes) => {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  for (let minutes = 4 * 60; minutes < 23 * 60; minutes += 30) {
    const startTime = toTime(minutes);
    const endTime = toTime(minutes + 30);

    slots.push({
      id: minutes,
      startTime,
      endTime,
      time: `${startTime} - ${endTime}`,
      status: "available",
    });
  }

  return slots;
};