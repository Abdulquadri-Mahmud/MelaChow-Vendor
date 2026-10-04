"use client";
import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import * as menuApi from '@/app/lib/menuApi';
import { saveMenuEdit } from '@/app/lib/saveMenuEdit.mjs';
import { useCreateFoodStore } from '@/app/context/CreateFoodStore';
import { useVendorProfile } from '@/app/context/VendorProfileContext';
import MenuWizard from '@/app/vendors/create-food/page';
import '@/app/components/vendor-workspace/vendor-workspace.css';

export default function EditFoodPage() {
  const {id}=useParams(), router=useRouter(), queryClient=useQueryClient();
  const {vendorProfile}=useVendorProfile(), vendorId=vendorProfile?._id || vendorProfile?.id;
  const original=useRef(null), initialized=useRef(null);
  const ready=useCreateFoodStore(state=>state._id);
  const {data,isPending,isError,refetch}=useQuery({queryKey:['food-item',id],queryFn:()=>menuApi.getMenuItemDetail(vendorId,id),enabled:!!vendorId && !!id});
  useEffect(()=>{
    if(!data?.item || initialized.current===id) return;
    const item=data.item, portions=data.portions || item.portions || [], groups=data.choice_groups || item.choice_groups || [];
    original.current=structuredClone({portions,choice_groups:groups});
    useCreateFoodStore.getState().initFromFood({...item, portions,choice_groups:groups,
      platform_category_id:item.platform_category?._id || item.platform_category?.id || item.platform_category_id,
      vendor_section_id:item.vendor_section?._id || item.vendor_section?.id || item.vendor_section_id});
    initialized.current=id;
  },[data,id]);
  const save=async()=>{
    const current=useCreateFoodStore.getState();
    const draft=structuredClone({name:current.name,description:current.description,image_url:current.image_url,item_type:current.item_type,dietary_type:current.dietary_type,prep_time_minutes:current.prep_time_minutes,tags:current.tags,platform_category_id:current.platform_category_id,vendor_section_id:current.vendor_section_id,portions:current.portions,choice_groups:current.choice_groups});
    await saveMenuEdit({vendorId,itemId:id,draft,original:original.current,api:menuApi,onCreated:(type,oldId,newId,groupId)=>{
      const state=useCreateFoodStore.getState();
      if(type==='portion') state.updatePortion(oldId,{tempId:newId});
      if(type==='group') state.updateChoiceGroup(oldId,{tempId:newId});
      if(type==='option') state.updateChoiceOption(groupId,oldId,{tempId:newId});
    }});
    await Promise.all([queryClient.invalidateQueries({queryKey:['food-item',id]}),queryClient.invalidateQueries({queryKey:['vendor-foods',vendorId]}),queryClient.invalidateQueries({queryKey:['vendor-menu',vendorId]})]);
  };
  if(isError) return <div className="mc-workspace mc-empty"><h1>Couldn’t load this menu item</h1><button className="mc-button" onClick={()=>refetch()}>Try again</button></div>;
  if(isPending || ready!==id) return <div className="mc-workspace mc-empty" role="status"><Loader2 className="animate-spin"/>Loading your menu editor…</div>;
  return <MenuWizard editMode onSave={save} onFinished={()=>router.push('/vendors/my-foods/'+id)}/>;
}
