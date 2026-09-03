import PropertyGallery from "@/components/vgroup/property-gallery";

export default async function PropertyLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
  const {id}=await params;
  return <><PropertyGallery propertyId={id}/>{children}</>;
}
