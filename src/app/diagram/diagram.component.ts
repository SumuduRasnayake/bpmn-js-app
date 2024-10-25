import {
  AfterContentInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  SimpleChanges,
  EventEmitter, AfterViewInit
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { map, switchMap } from 'rxjs/operators';

import type Canvas from 'diagram-js/lib/core/Canvas';
import type { ImportDoneEvent, ImportXMLResult } from 'bpmn-js';
import BpmnJS from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';

import { from, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-diagram',
  templateUrl: './diagram.component.html',
  styleUrls: ['./diagram.component.scss']
})
export class DiagramComponent implements AfterContentInit, OnChanges, OnDestroy, OnInit, AfterViewInit {

  @ViewChild('ref', { static: true }) private el: ElementRef;
  @ViewChild('propertiesRef', { static: true }) propertiesRef: ElementRef;
  @Input() private url?: string;
  @Output() private importDone: EventEmitter<ImportDoneEvent> = new EventEmitter();
  private bpmnJS: BpmnJS = new BpmnJS();

  constructor(private http: HttpClient) {
  }

  ngAfterContentInit(): void {
    this.bpmnJS.attachTo(this.el.nativeElement);
  }

  ngAfterViewInit() {
    this.bpmnJS.attachTo(this.el.nativeElement);
  }

  ngOnInit(): void {
    /*if (this.url) {
      this.loadUrl(this.url);
    }*/
    this.initializeBpmnJs();
  }

  initializeBpmnJs() {
    this.bpmnJS = new BpmnJS({
      propertiesPanel: {
        parent: '#properties'
        // parent: this.propertiesRef.nativeElement
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule
      ],
    });

    this.bpmnJS.on<ImportDoneEvent>('import.done', ({ error }) => {
      if (!error) {
        this.bpmnJS.get<Canvas>('canvas').zoom('fit-viewport');
      }
    });

    this.bpmnJS.on('elementTemplates.errors', function (event) {
    });
    this.bpmnJS.attachTo(this.el.nativeElement);
    /*const propertiesPanel = this.bpmnJS.get('propertiesPanel');
    propertiesPanel?.attachTo(this.propertiesRef.nativeElement)*/

    this.loadInitialDiagram()
  }

  loadInitialDiagram() {
    this.http.get('../../assets/bpmn/defaultVal.bpmn', {responseType: 'text'})
      .subscribe(
        (xml: any) => {
          this.importDiagram(xml);
        },
        (err: any) => {
        }
      );
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('onChange', changes);
    // re-import whenever the url changes
    if (changes.url) {
      // this.loadUrl(changes.url.currentValue);
    }
  }

  ngOnDestroy(): void {
    this.bpmnJS.destroy();
  }

  /**
   * Load diagram from URL and emit completion event
   */
  loadUrl(url: string): Subscription {

    return (
      this.http.get(url, { responseType: 'text' }).pipe(
        switchMap((xml: string) => this.importDiagram(xml)),
        map(result => result.warnings),
      ).subscribe(
        (warnings) => {
          this.importDone.emit({
            type: 'success',
            warnings
          });
        },
        (err) => {
          this.importDone.emit({
            type: 'error',
            error: err
          });
        }
      )
    );
  }

  /**
   * Creates a Promise to import the given XML into the current
   * BpmnJS instance, then returns it as an Observable.
   *
   * @see https://github.com/bpmn-io/bpmn-js-callbacks-to-promises#importxml
   */
  private importDiagram(xml: string): Observable<ImportXMLResult> {
    return from(this.bpmnJS.importXML(xml));
  }
}
