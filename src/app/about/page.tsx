// Edit the copy below (names, bios, ages comfortable with, photos) to match
// the two of you. Swap each placeholder <div> for a real photo using
// next/image once you have one, e.g.:
//   import Image from "next/image";
//   <Image src="/photos/you.jpg" alt="..." width={160} height={160} className="rounded-full object-cover" />
// and drop the image file in the `public/photos/` folder.

const team = [
  {
    name: "Your Name",
    bio: "Hi! I'm ___ years old and I love bringing energy to any party. I've been entertaining kids at family events for ___ and I'm great at ___.",
    goodWith: "Ages 3-10, party games, arts & crafts, face painting",
  },
  {
    name: "Your Friend's Name",
    bio: "Hey there! I'm ___ and I'm always the one running the games at family get-togethers. I especially love ___.",
    goodWith: "Ages 5-12, group games, scavenger hunts, balloon animals",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">About Us</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          We&rsquo;re two friends who love turning parties and get-togethers into something kids
          actually remember &mdash; here&rsquo;s a bit about who we are.
        </p>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {team.map((person) => (
          <div key={person.name} className="rounded-2xl border border-card-border bg-card p-6 text-center shadow-sm">
            {/* Photo placeholder — replace with a real photo, see comment above */}
            <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-primary-soft text-3xl font-semibold text-primary">
              {person.name
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </div>
            <h2 className="text-lg font-semibold">{person.name}</h2>
            <p className="mt-2 text-sm text-muted">{person.bio}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary">
              {person.goodWith}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-card-border bg-card p-6 text-sm text-muted">
        <h3 className="mb-2 font-semibold text-foreground">A few more things</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>We&rsquo;re available on weekends and some weeknights &mdash; just ask!</li>
          <li>Payment is cash or e-transfer, arranged directly with you.</li>
          <li>We&rsquo;re happy to bring games and activities, or use what you have at home.</li>
        </ul>
      </div>
    </div>
  );
}
