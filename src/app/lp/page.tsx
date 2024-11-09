
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Star } from 'lucide-react'

export default function Component() {
  return (
    <div className="bg-[#1A1A1A] text-white font-sans">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <motion.h1 
          className="text-4xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          思考を深め、成長を加速する<br />パーソナルAIメモアプリ
        </motion.h1>
        <motion.p 
          className="text-lg mb-8 text-center text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          内省と思考の整理を、AIがシームレスにサポート
        </motion.p>
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <img src="/images/placeholder.png" alt="App Mockup" className="w-64 h-auto rounded-2xl shadow-lg" />
        </motion.div>
        <div className="flex gap-4">
          <motion.button 
            className="bg-[#6B66FF] text-white px-6 py-3 rounded-full font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            App Store
          </motion.button>
          <motion.button 
            className="bg-white text-[#1A1A1A] px-6 py-3 rounded-full font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Google Play
          </motion.button>
        </div>
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ChevronDown className="w-8 h-8 text-gray-400" />
        </motion.div>
      </section>

      {/* Challenge Section */}
      <section className="py-16 px-6">
        <h2 className="text-2xl font-bold mb-8 text-center">成長のスピードが遅く感じませんか？</h2>
        <div className="space-y-8">
          {['毎日を振り返る時間がない', 'アイデアは浮かぶが、深められない', '過去の経験が次に活きていない'].map((challenge, index) => (
            <motion.div 
              key={index}
              className="bg-gray-800 p-6 rounded-lg"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              {challenge}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <h2 className="text-2xl font-bold mb-8 text-center">主要機能</h2>
        {[
          { title: 'シンプルなメモ機能', description: '思考をすばやくキャプチャ' },
          { title: 'AIとの対話機能', description: '内省を深め、新たな気づきを促進' },
          { title: '思考の視覚化', description: 'アイデアをリンクし、新たな発見を' }
        ].map((feature, index) => (
          <motion.div 
            key={index}
            className="mb-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <img src="/images/placeholder.png" alt={feature.title} className="w-full h-48 object-cover rounded-lg mb-4" />
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-300">{feature.description}</p>
          </motion.div>
        ))}
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-6 bg-gray-900">
        <h2 className="text-2xl font-bold mb-8 text-center">使用シーン</h2>
        <div className="space-y-8">
          {['通勤中の気づきメモ', '仕事後の振り返り', '週末のアイデア整理'].map((useCase, index) => (
            <motion.div 
              key={index}
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="w-16 h-16 bg-[#6B66FF] rounded-full flex items-center justify-center">
                <span className="text-2xl">{index + 1}</span>
              </div>
              <p className="flex-1">{useCase}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-6">
        <h2 className="text-2xl font-bold mb-8 text-center">ユーザーの声</h2>
        <div className="space-y-8">
          {[
            { name: '田中さん', comment: '毎日の振り返りが習慣化し、自己成長を実感できるようになりました。' },
            { name: '佐藤さん', comment: 'アイデアの繋がりが可視化され、新しいビジネスチャンスを発見できました。' },
            { name: '鈴木さん', comment: 'AIとの対話で、自分では気づかなかった視点を得られ、思考が深まりました。' }
          ].map((testimonial, index) => (
            <motion.div 
              key={index}
              className="bg-gray-800 p-6 rounded-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="mb-4">"{testimonial.comment}"</p>
              <p className="text-right text-gray-400">- {testimonial.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-[#6B66FF] text-[#1A1A1A]">
        <h2 className="text-2xl font-bold mb-8 text-center">数値で見る効果</h2>
        <div className="grid grid-cols-2 gap-8">
          {[
            { label: '週間振り返り実施率', value: '85%' },
            { label: '新しい気づきの発見数', value: '週平均7個' },
            { label: 'ユーザー満足度', value: '4.8/5.0' }
          ].map((stat, index) => (
            <motion.div 
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-8">あなたの成長を加速させましょう</h2>
        <p className="mb-8">14日間の無料トライアルで、AIメモの力を体験してください。</p>
        <motion.button 
          className="bg-[#6B66FF] text-white px-8 py-4 rounded-full font-semibold text-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          無料で始める
        </motion.button>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-gray-400 text-sm">
        <p>&copy; 2024 AI Memo App. All rights reserved.</p>
      </footer>
    </div>
  )
}