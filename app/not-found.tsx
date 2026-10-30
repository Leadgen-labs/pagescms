import { UiText } from "@/components/ui-text";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Empty className="absolute inset-0 border-0 rounded-none">
      <EmptyHeader>
        <EmptyTitle><UiText text={"Page not found"} /></EmptyTitle>
        <EmptyDescription><UiText text={"The page or resource you requested could not be found."} /></EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link className={buttonVariants({ variant: "default" })} href="/">
          <UiText text={"Go home"} /> </Link>
      </EmptyContent>
    </Empty>
  )
}
