import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: 'app-category-tree-item',
  standalone: true,
  imports: [CommonModule, CategoryTreeItemComponent],// S'importe lui-même !
  templateUrl: './category-tree-item.component.html',
  styles: [`
    .children { margin-left: 20px; list-style-type: none; border-left: 1px dashed #ccc; }
    .category-name { cursor: pointer; font-weight: 500; }
    .category-name:hover { color: #007bff; }
  `]
})
export class CategoryTreeItemComponent {
  @Input() category: any;
  isExpanded = false;

  toggle() {
    this.isExpanded = !this.isExpanded;
  }
}
