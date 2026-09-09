import type {PermissionKey} from "@/lib/vgroup/contracts";
import type {VivitoCapability,VivitoWorkspace} from "@/lib/vgroup/vivito-cross-workspace";
import {VIVITO_CAPABILITIES} from "@/lib/vgroup/vivito-cross-workspace";
import type {VivitoReadTool} from "@/lib/vgroup/vivito-read-tools";
import {VIVITO_READ_TOOLS} from "@/lib/vgroup/vivito-read-tools";

export type VivitoToolMode="read"|"write";
export type VivitoToolRisk="read"|"write"|"sensitive";
export type VivitoUnifiedTool={
  key:string;
  workspace:VivitoWorkspace;
  label:string;
  mode:VivitoToolMode;
  risk:VivitoToolRisk;
  permission?:PermissionKey;
  approvalRequired:boolean;
  enabled:boolean;
};

const fromRead=(tool:VivitoReadTool):VivitoUnifiedTool=>({
  key:tool.key,workspace:tool.workspace,label:tool.label,mode:"read",risk:"read",
  permission:tool.permission,approvalRequired:false,enabled:true,
});
const fromWrite=(cap:VivitoCapability):VivitoUnifiedTool=>({
  key:cap.key,workspace:cap.workspace,label:cap.label,mode:"write",risk:cap.risk,
  permission:cap.permission,approvalRequired:cap.approvalRequired,enabled:cap.enabled,
});

export const VIVITO_TOOL_REGISTRY:readonly VivitoUnifiedTool[]=[
  ...VIVITO_READ_TOOLS.map(fromRead),
  ...VIVITO_CAPABILITIES.map(fromWrite),
];

export function findVivitoUnifiedTool(key:string){return VIVITO_TOOL_REGISTRY.find(tool=>tool.key===key)}
export function publicVivitoToolRegistry(){return VIVITO_TOOL_REGISTRY.map(({key,workspace,label,mode,risk,permission,approvalRequired,enabled})=>({key,workspace,label,mode,risk,permission,approvalRequired,enabled}))}
