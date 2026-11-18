// Formatting in Dishlist's voice: "Oct 12" (year only when it isn't this year),
// "Ordered 3 times", "$18".

export function formatDate(iso: string, now = new Date()) {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) options.year = 'numeric';
  return d.toLocaleDateString('en-US', options);
}

const wholeDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** "$18" for whole amounts, "$18.50" otherwise. */
export function formatPrice(amount: number) {
  return (Number.isInteger(amount) ? wholeDollars : cents).format(amount);
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : pluralForm}`;
}

/** "Ordered once" / "Ordered 3 times". */
export function timesOrdered(n: number) {
  return n === 1 ? 'Ordered once' : `Ordered ${n} times`;
}

/** "Good morning" / "Good afternoon" / "Good evening". */
export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** "Ordered 3 times · last Oct 12", plus "Waiting to sync" when it hasn't reached the server. */
export function dishFootnote(dish: { timesOrdered: number; lastDate: string }, pending = false) {
  const parts = [timesOrdered(dish.timesOrdered), `last ${formatDate(dish.lastDate)}`];
  if (pending) parts.push('Waiting to sync');
  return parts.join(' · ');
}
