import { Card, CardContent } from "@/components/ui/card";
import { trustBadges } from "@/lib/data";

export default function TrustBadges() {
    return (
        <section className="mt-8">
             <h2 className="text-2xl font-bold font-headline mb-4">Why Choose Us?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {trustBadges.map((badge, index) => (
                    <Card key={index} className="text-center">
                        <CardContent className="p-6 flex flex-col items-center gap-3">
                            <badge.icon className="h-10 w-10 text-primary" />
                            <h3 className="font-semibold text-lg">{badge.title}</h3>
                            <p className="text-sm text-muted-foreground">{badge.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
