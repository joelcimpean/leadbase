import {
  ArrowUpRight,
  CalendarCheck,
  CircleCheck,
  Clock3,
  Mail,
  MessageSquareReply,
  Search,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    label: "New leads",
    value: "24",
    icon: UserPlus,
  },
  {
    label: "Qualified",
    value: "11",
    icon: CircleCheck,
  },
  {
    label: "Drafts ready",
    value: "6",
    icon: Clock3,
  },
  {
    label: "Emails sent",
    value: "18",
    icon: Mail,
  },
  {
    label: "Replies",
    value: "5",
    icon: MessageSquareReply,
  },
  {
    label: "Calls booked",
    value: "2",
    icon: CalendarCheck,
  },
  {
    label: "Won clients",
    value: "1",
    icon: Trophy,
  },
  {
    label: "Pipeline value",
    value: "€8,400",
    icon: ArrowUpRight,
  },
];

const recentActivity = [
  {
    company: "Beispiel Gartenbau",
    action: "Lead qualified",
    time: "12 min ago",
  },
  {
    company: "Example Consulting",
    action: "Email draft created",
    time: "38 min ago",
  },
  {
    company: "Demo Energy GmbH",
    action: "Website research completed",
    time: "1 hr ago",
  },
  {
    company: "Sample Studio",
    action: "Reply received",
    time: "3 hrs ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-8 py-8 lg:px-10 lg:py-10">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Overview</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Your lead pipeline, outreach activity and next actions in one place.
          </p>
        </div>

        <Badge variant="outline" className="h-8 rounded-lg px-3 font-normal">
          Private workspace
        </Badge>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.label} className="shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>

                  <div className="flex size-8 items-center justify-center rounded-lg border">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                </div>

                <p className="mt-5 text-2xl font-semibold tracking-tight">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Recent activity</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest changes across your leads
                </p>
              </div>

              <button className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                View all
              </button>
            </div>

            <div>
              {recentActivity.map((activity, index) => (
                <div
                  key={`${activity.company}-${activity.action}`}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
                    index !== recentActivity.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Users className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {activity.company}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activity.action}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-5">
            <div>
              <h2 className="text-sm font-semibold">Pipeline</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Current lead distribution
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <PipelineRow label="Researching" value={8} total={24} />
              <PipelineRow label="Qualified" value={11} total={24} />
              <PipelineRow label="Contacted" value={7} total={24} />
              <PipelineRow label="Replied" value={5} total={24} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardContent className="flex min-h-40 items-center justify-between p-5">
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg border">
                <Search className="size-4" />
              </div>

              <h2 className="mt-5 text-sm font-semibold">Find new leads</h2>

              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Search for companies by industry and location and review them
                before importing.
              </p>
            </div>

            <ArrowUpRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="flex min-h-40 items-center justify-between p-5">
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg border">
                <Mail className="size-4" />
              </div>

              <h2 className="mt-5 text-sm font-semibold">
                Drafts waiting for review
              </h2>

              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                6 personalized drafts are ready for review before anything gets
                sent.
              </p>
            </div>

            <ArrowUpRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PipelineRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}