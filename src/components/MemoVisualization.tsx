// src/components/MemoVisualization.tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import * as d3 from 'd3'
import { createClient } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2, Move, X, Pencil } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Slider
} from '@/components/ui/slider'
import { EditMemoDialog } from '@/components/EditMemoDialog'
import { Memory, Category } from '@/types'

interface MemoNode extends d3.SimulationNodeDatum, Memory {}

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface LinkDatum extends d3.SimulationLinkDatum<MemoNode> {
  source: string | MemoNode
  target: string | MemoNode
}

export default function MemoVisualization() {
  const { user } = useAuth()  // 追加
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<MemoNode | null>(null)
  const [memos, setMemos] = useState<MemoNode[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [nodeDistance, setNodeDistance] = useState<number>(100)
  const [isLoading, setIsLoading] = useState(true)
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>()
  const containerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return  // ユーザーが未認証の場合は早期リターン

      try {
        // カテゴリーの取得
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
          // RLSが有効なため、user_idによるフィルタリングは不要

        if (categoriesError) throw categoriesError
        setCategories(categoriesData || [])

        // メモの取得
        const { data: memosData, error: memosError } = await supabase
          .from('memories')
          .select(`
            id,
            title,
            content,
            importance,
            created_at,
            category_id,
            user_id,
            categories (
              id,
              name
            )
          `)
          .eq('user_id', user.id)      // 現在のユーザーのデータのみを取得
          .order('created_at', { ascending: false })
          // RLSが有効なため、user_idによるフィルタリングは不要

        if (memosError) throw memosError

        // 関連メモの取得
        const { data: relationsData, error: relationsError } = await supabase
          .from('memory_relations')
          .select('source_memo_id, target_memo_id')

        if (relationsError) throw relationsError

        const memosWithRelations = memosData.map(memo => {
          // memo.categories[0] が null の場合のフォールバック
          const category = memo.categories[0] || { 
            id: 'uncategorized', 
            name: 'Uncategorized' 
          }
          
          const typedMemo: MemoNode = {
            id: memo.id,
            title: memo.title,
            content: memo.content,
            importance: memo.importance,
            created_at: memo.created_at,
            category_id: memo.category_id,
            user_id: memo.user_id, // user_idを明示的に含める
            categories: category,
            relatedMemos: relationsData
              .filter(rel => rel.source_memo_id === memo.id)
              .map(rel => rel.target_memo_id),
            // シミュレーションのための座標プロパティ
            x: undefined,
            y: undefined,
            vx: undefined,
            vy: undefined,
            fx: null,
            fy: null,
          }
          return typedMemo
        })

        setMemos(memosWithRelations)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])  // userを依存配列に追加


  const handleMemoUpdate = async () => {
    if (!user) return false

    try {
      const { data: memosData, error: memosError } = await supabase
        .from('memories')
        .select(`
          id,
          title,
          content,
          importance,
          created_at,
          category_id,
          user_id,
          categories (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (memosError) throw memosError

      const { data: relationsData, error: relationsError } = await supabase
        .from('memory_relations')
        .select('source_memo_id, target_memo_id')

      if (relationsError) throw relationsError

      const updatedMemosWithRelations = memosData.map(memo => {
        const typedMemo: MemoNode = {
          id: memo.id,
          title: memo.title,
          content: memo.content,
          importance: memo.importance,
          created_at: memo.created_at,
          category_id: memo.category_id,
          user_id: memo.user_id,
          categories: memo.categories[0],
          relatedMemos: relationsData
            .filter(rel => rel.source_memo_id === memo.id)
            .map(rel => rel.target_memo_id),
          x: undefined,
          y: undefined,
          vx: undefined,
          vy: undefined,
          fx: null,
          fy: null,
        }
        return typedMemo
      })

      setMemos(updatedMemosWithRelations)
      return true
    } catch (error) {
      console.error('Error updating memos:', error)
      return false
    }
  }

  const categoryColorScale = d3.scaleOrdinal<string>()
    .domain(categories.map(c => c.id))
    .range(d3.schemePaired)

  useEffect(() => {
    if (!svgRef.current || isLoading || memos.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = window.innerWidth
    const height = window.innerHeight
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g')
    containerRef.current = g

    const filteredMemos = selectedCategory === 'all'
      ? memos
      : memos.filter(memo => memo.category_id === selectedCategory)

    const linkData: LinkDatum[] = filteredMemos.flatMap(memo => 
      memo.relatedMemos
        .filter(relatedId => filteredMemos.some(m => m.id === relatedId))
        .map(relatedId => ({
          source: memo.id,
          target: relatedId
        }))
    )

    const simulation = d3.forceSimulation<MemoNode>(filteredMemos)
      .force('link', d3.forceLink<MemoNode, LinkDatum>(linkData)
        .id(d => d.id)
        .distance(nodeDistance))
      .force('charge', d3.forceManyBody()
        .strength(-120)
        .distanceMax(200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(5))
      .alphaDecay(0.01)

    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)

    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(filteredMemos)
      .join('g')

    nodes.append('circle')
      .attr('r', d => Math.min((d.importance || 1) * 5, 100))
      .attr('fill', d => categoryColorScale(d.category_id))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)

    // ノードのテキスト部分
    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '6px')
      .attr('fill', '#333')
      .each(function(d) {
        const text = d3.select(this);
        const maxLength = 12;  // 1行の最大文字数
        
        // 1行目
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', '-1.2em')  // 上方向への位置調整
          .text(d.title.slice(0, maxLength));
        
        // 2行目
        if (d.title.length > maxLength) {
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', '1.2em')  // 行間隔
            .text(d.title.slice(maxLength, maxLength * 2) + 
                  (d.title.length > maxLength * 2 ? '...' : ''));
        }
      });

    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    zoomRef.current = zoom
    svg.call(zoom as any)

    function drag(simulation: d3.Simulation<MemoNode, undefined>) {
      function dragstarted(event: d3.D3DragEvent<Element, MemoNode, MemoNode>) {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      }
      
      function dragged(event: d3.D3DragEvent<Element, MemoNode, MemoNode>) {
        event.subject.fx = event.x
        event.subject.fy = event.y
      }
      
      function dragended(event: d3.D3DragEvent<Element, MemoNode, MemoNode>) {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
      }
      
      return d3.drag<Element, MemoNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    }

    nodes.call(drag(simulation) as any)

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as MemoNode).x || 0)
        .attr('y1', d => (d.source as MemoNode).y || 0)
        .attr('x2', d => (d.target as MemoNode).x || 0)
        .attr('y2', d => (d.target as MemoNode).y || 0)

      nodes.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    nodes.on('click', (event: MouseEvent, d: MemoNode) => {
      event.stopPropagation()
      setSelectedNode(d)
      const relatedNodes = filteredMemos.filter(memo => 
        d.relatedMemos.includes(memo.id) || memo.id === d.id
      )
      nodes.attr('opacity', 0.2)
      link.attr('opacity', 0.1)
      
      d3.selectAll(relatedNodes.map(n => 
        nodes.filter((d: MemoNode) => d.id === n.id).nodes()
      ).flat()).attr('opacity', 1)
      
      d3.selectAll(relatedNodes.map(n => 
        link.filter((l: LinkDatum) => 
          (l.source as MemoNode).id === n.id || (l.target as MemoNode).id === n.id
        ).nodes()
      ).flat()).attr('opacity', 1)
    })

    svg.on('click', (event) => {
      if (event.target === svg.node()) {
        setSelectedNode(null)
        nodes.attr('opacity', 1)
        link.attr('opacity', 1)
      }
    })

    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      svg.attr('width', width).attr('height', height)
      simulation.force('center', d3.forceCenter(width / 2, height / 2))
      simulation.alpha(1).restart()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      simulation.stop()
    }
  }, [memos, isLoading, selectedCategory, nodeDistance, categories])

  const handleFitView = () => {
    if (!svgRef.current || !containerRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    const g = containerRef.current
    const zoom = zoomRef.current
    const bounds = (g.node() as SVGGElement).getBBox()
    const width = parseInt(svg.attr('width'))
    const height = parseInt(svg.attr('height'))
    const scale = 0.95 / Math.max(bounds.width / width, bounds.height / height)
    const translateX = (width - scale * (bounds.x * 2 + bounds.width)) / 2
    const translateY = (height - scale * (bounds.y * 2 + bounds.height)) / 2

    svg.transition()
      .duration(750)
      .call(zoom.transform as any, d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale))
  }

  return (
    <div className="w-full h-screen relative">
      {!user ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-lg text-gray-600">
            Please log in to view memory visualization.
          </p>
        </div>
      ) : (
        <>
          {/* 既存のUI要素 */}
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 bg-white/90 p-4 rounded-lg shadow-lg">
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" size="icon" onClick={handleFitView}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Move className="h-4 w-4" />
              <div className="flex-grow">
                <Slider
                  value={[nodeDistance]}
                  onValueChange={([value]) => setNodeDistance(value)}
                  min={50}
                  max={200}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>
          </div>
  
          <svg ref={svgRef} className="w-full h-full bg-gray-50"></svg>
  
{/* モバイル向け詳細表示（修正版） */}
<AnimatePresence>
  {selectedNode && (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 500 }}
      className="fixed bottom-0 left-0 right-0 bg-white shadow-lg rounded-t-2xl h-[60vh] flex flex-col"
    >
      {/* ヘッダー部分 */}
      <div className="flex-none p-4 border-b bg-white">
        <div className="relative mb-8">
          {/* ボタン類を最前面に */}
          <div className="absolute right-0 top-0 z-10 flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedNode(null)}
              aria-label="Close details"
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-6 w-6"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          {/* タイトルをスクロール可能なコンテナで囲む */}
          <div className="max-h-24 overflow-y-auto pr-12">
            <h2 className="text-xl font-bold">{selectedNode.title}</h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-gray-600">
            {new Date(selectedNode.created_at).toLocaleString()}
          </span>
          <span 
            className="font-medium" 
            style={{ color: categoryColorScale(selectedNode.category_id) }}
          >
            {selectedNode.categories?.name}
          </span>
          <span className="bg-blue-100 px-2 py-1 rounded-full">
            Importance: {selectedNode.importance}
          </span>
        </div>
      </div>

      {/* コンテンツ部分 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {selectedNode.content}
          </p>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
  
          <EditMemoDialog
            memo={selectedNode}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSave={async () => {
              const result = await handleMemoUpdate()
              if (result) setIsEditDialogOpen(false)
            }}
            supabase={supabase}
          />
        </>
      )}
    </div>
  ); 
}