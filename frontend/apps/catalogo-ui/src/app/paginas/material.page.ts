import { AfterViewInit, ChangeDetectionStrategy, Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CantidadPipe, DineroPipe } from '@nianva/ui-format';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';

interface FilaMaterial {
  producto: string;
  cantidad: number;
  total: number;
}

@Component({
  selector: 'cat-material-page',
  standalone: true,
  imports: [
    CantidadPipe,
    DineroPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    PageHeaderComponent,
    ReactiveFormsModule,
    SectionComponent,
  ],
  templateUrl: './material.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialPage implements AfterViewInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('dialogoTemplate') private dialogoTemplate!: TemplateRef<unknown>;
  @ViewChild(MatPaginator) set paginador(paginador: MatPaginator) {
    if (paginador) {
      this.dataSource.paginator = paginador;
    }
  }

  protected readonly columnas = ['producto', 'cantidad', 'total'];
  protected readonly filas: FilaMaterial[] = [
    { producto: 'Arroz', cantidad: 2, total: 64 },
    { producto: 'Café', cantidad: 1, total: 190 },
    { producto: 'Agua', cantidad: 3, total: 54 },
  ];
  protected readonly dataSource = new MatTableDataSource(this.filas);
  protected readonly campoError = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor() {
    this.campoError.markAsTouched();
  }

  ngAfterViewInit(): void {
    this.abrirDialogo();
  }

  protected abrirDialogo(): void {
    this.dialog.open(this.dialogoTemplate, { width: '22rem' });
  }

  protected abrirSnackBar(): void {
    this.snackBar.open('Snackbar de prueba', 'Cerrar', { duration: 3000 });
  }
}
