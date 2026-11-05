import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

@Directive({
  selector: '[uiSkeletonBar]',
  standalone: true,
})
export class SkeletonBarDirective implements OnChanges {
  private readonly element = inject(ElementRef<HTMLElement>);

  @Input() ancho = '100%';
  @Input() alto = '1rem';

  ngOnChanges(): void {
    this.element.nativeElement.style.width = this.ancho;
    this.element.nativeElement.style.height = this.alto;
  }
}
