import React from "react";
import { Business } from "./BusinessCard";
import { BusinessPublicDetail } from "./BusinessPublicDetail";
interface DirectBusinessViewProps {
  business: Business;
  onBack: () => void;
  isAdmin?: boolean;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string | number) => void;
  onToggleTop?: (id: string | number) => void;
  onToggleRecommended?: (id: string | number) => void;
  onBackToDirectory?: () => void;
  onSearchFromPage?: (q: string) => void;
  onOpenDigitalCard?: (b: Business) => void;
  onEditBusiness?: (b: Business) => void;
  onDeleteBusiness?: (b: Business) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (b: Business) => void;
  activePromotion?: any;
  onOpenPromotion?: (p: any) => void;
  onAdminClick?: () => void;
}
export function DirectBusinessView(props: DirectBusinessViewProps) {
  return (
    <BusinessPublicDetail
      key={props.business.id}
      business={props.business}
      onBack={props.onBackToDirectory || props.onBack}
      isFavorite={props.isFavorite}
      onToggleFavorite={
        props.onToggleFavorite
          ? () => props.onToggleFavorite!(props.business)
          : undefined
      }
      onAdminClick={props.onAdminClick}
      onEditBusiness={props.onEditBusiness || props.onEdit}
      onOpenDigitalCard={props.onOpenDigitalCard}
      activePromotion={props.activePromotion}
      onOpenPromotion={props.onOpenPromotion}
    />
  );
}
