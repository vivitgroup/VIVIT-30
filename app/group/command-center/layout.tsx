import type {ReactNode} from "react";
import {VivitoLauncher} from "@/components/vgroup/vivito-launcher";
export default function CommandCenterLayout({children}:{children:ReactNode}){return <>{children}<VivitoLauncher workspace="group"/></>}
